package se.daan.covid

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.event.ContextRefreshedEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import java.time.Clock
import java.time.ZonedDateTime
import java.util.concurrent.atomic.AtomicReference


@Component
class DataService(
        private val restTemplate: RestTemplate,
        private val clock: Clock,
        @Value("\${data.newCases.url}") private val newCasesUrl: String,
        @Value("\${data.newCases.skipLast}") private val newCasesSkipLast: Int,
        @Value("\${data.hospital.url}") private val hospitalUrl: String,
        @Value("\${data.deaths.url}") private val deathsUrl: String,
        @Value("\${data.deaths.skipLast}") private val deathsSkipLast: Int
) {
    private val loadedData = AtomicReference<Data>()

    fun isReady(): Boolean {
        return loadedData.get() != null
    }

    fun getData(): Data? {
        return loadedData.get()
    }

    @EventListener
    fun onApplicationEvent(event: ContextRefreshedEvent?) {
        loadData()
    }

    @Scheduled(cron = "\${data.cron}", zone = "\${clock.zone}")
    fun load() {
        loadData()
    }

    private fun loadData() {
        try {
            val timestamp = ZonedDateTime.now(clock)
            val cases = restTemplate.getForObject(newCasesUrl, Array<CasesRecord>::class.java)?.asList()
            val hospital = restTemplate.getForObject(hospitalUrl, Array<HospitalRecord>::class.java)?.asList()
            val death = restTemplate.getForObject(deathsUrl, Array<DeathRecord>::class.java)?.asList()

            if (cases == null || hospital == null || death == null) {
                return //TODO
            }

            val dates = (cases + hospital + death)
                    .mapNotNull { it.date }
                    .distinct()
                    .sorted()

            val data = Data(
                    timestamp,
                    dates,
                    groupPerRegionProvince(cases, dates, CasesRecord::cases, newCasesSkipLast),
                    groupPerRegionProvince(hospital, dates, HospitalRecord::newIn, 0),
                    groupPerRegionProvince(hospital, dates, HospitalRecord::total, 0),
                    groupPerRegionProvince(hospital, dates, HospitalRecord::icu, 0),
                    groupPerRegion(death, dates, DeathRecord::deaths, deathsSkipLast)
            )
            loadedData.set(data)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun <R : RegionRecord> groupPerRegion(list: List<R>, keys: List<String>, fn: (R) -> Int, skip: Int): PerRegion {
        return PerRegion(
                mapDataPoints(list.filter { it.region == "Flanders" }, keys, fn, skip),
                mapDataPoints(list.filter { it.region == "Brussels" }, keys, fn, skip),
                mapDataPoints(list.filter { it.region == "Wallonia" }, keys, fn, skip),

                mapDataPoints(list.filter { it.region == null }, keys, fn, skip)
        )
    }

    private fun <P : ProvinceRecord> groupPerRegionProvince(list: List<P>, keys: List<String>, fn: (P) -> Int, skip: Int): PerProvince {
        return PerProvince(
                mapDataPoints(list.filter { it.province == "WestVlaanderen" }, keys, fn, skip),
                mapDataPoints(list.filter { it.province == "OostVlaanderen" }, keys, fn, skip),
                mapDataPoints(list.filter { it.province == "Antwerpen" }, keys, fn, skip),
                mapDataPoints(list.filter { it.province == "VlaamsBrabant" }, keys, fn, skip),
                mapDataPoints(list.filter { it.province == "Limburg" }, keys, fn, skip),

                mapDataPoints(list.filter { it.province == "Brussels" }, keys, fn, skip),

                mapDataPoints(list.filter { it.province == "Hainaut" }, keys, fn, skip),
                mapDataPoints(list.filter { it.province == "BrabantWallon" }, keys, fn, skip),
                mapDataPoints(list.filter { it.province == "Namur" }, keys, fn, skip),
                mapDataPoints(list.filter { it.province == "Liège" }, keys, fn, skip),
                mapDataPoints(list.filter { it.province == "Luxembourg" }, keys, fn, skip),

                mapDataPoints(list.filter { it.province == null }, keys, fn, skip)
        )
    }

    private fun <P : RegionRecord> mapDataPoints(list: List<P>, keys: List<String>, fn: (P) -> Int, skip: Int): List<Int?> {
        val byDate = list.groupBy { it.date }

        return keys.map {
            byDate.getOrDefault(it, null)
                    ?.map(fn)
                    ?.sum()
                    ?: 0
        }
                .dropLast(skip) + MutableList(skip) { null }
    }
}

/**
 *  {
 *      "timestamp": "1234",
 *      "newCases": {
 *          "FL": {
 *              "WV": [],
 *              "OV": [],
 *              "AN": [],
 *              "VB": [],
 *              "LM": []
 *          },
 *          "BR": {
 *              "BR": []
 *          }
 *          "WA": {
 *              "HA": [],
 *              "BW": [],
 *              "NA": [],
 *              "LG": [],
 *              "LU": []
 *          }
 *      },
 *      "newHospital": {},
 *      "inHospital": {},
 *      "inIcu": {},
 *      "deaths": {
 *          "FL": [],
 *          "BR": [],
 *          "WA": []
 *      }
 *  }
 */

data class Data(
        @JsonProperty("timestamp")
        val timestamp: ZonedDateTime,
        @JsonProperty("dates")
        val dates: List<String>,
        @JsonProperty("newCases")
        val newCases: PerProvince,
        @JsonProperty("newHospital")
        val newHospital: PerProvince,
        @JsonProperty("inHospital")
        val inHospital: PerProvince,
        @JsonProperty("inIcu")
        val inIcu: PerProvince,
        @JsonProperty("deaths")
        val deaths: PerRegion
)

data class PerRegion(
        @JsonProperty("FL")
        val flanders: List<Int?>,
        @JsonProperty("BR")
        val brussels: List<Int?>,
        @JsonProperty("WA")
        val wallonia: List<Int?>,

        @JsonProperty("BE")
        val other: List<Int?>
)

data class PerProvince(
        @JsonProperty("WV")
        val westVlaanderen: List<Int?>,
        @JsonProperty("OV")
        val oostVlaanderen: List<Int?>,
        @JsonProperty("AN")
        val antwerpen: List<Int?>,
        @JsonProperty("VB")
        val vlaamsBrabant: List<Int?>,
        @JsonProperty("LM")
        val limburg: List<Int?>,

        @JsonProperty("BR")
        val brussels: List<Int?>,

        @JsonProperty("HA")
        val hainaut: List<Int?>,
        @JsonProperty("BW")
        val brabantWallon: List<Int?>,
        @JsonProperty("NA")
        val namur: List<Int?>,
        @JsonProperty("LG")
        val liege: List<Int?>,
        @JsonProperty("LX")
        val luxembourg: List<Int?>,

        @JsonProperty("BE")
        val other: List<Int?>
)

interface ProvinceRecord : RegionRecord {
    val province: String?
}

interface RegionRecord {
    val date: String?
    val region: String?
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class CasesRecord(
        @JsonProperty("DATE")
        override val date: String?,
        @JsonProperty("PROVINCE")
        override val province: String?,
        @JsonProperty("REGION")
        override val region: String?,
        @JsonProperty("CASES")
        val cases: Int
) : ProvinceRecord

@JsonIgnoreProperties(ignoreUnknown = true)

data class HospitalRecord(
        @JsonProperty("DATE")
        override val date: String?,
        @JsonProperty("PROVINCE")
        override val province: String?,
        @JsonProperty("REGION")
        override val region: String?,
        @JsonProperty("TOTAL_IN")
        val total: Int,
        @JsonProperty("TOTAL_IN_ICU")
        val icu: Int,
        @JsonProperty("NEW_IN")
        val newIn: Int
) : ProvinceRecord

@JsonIgnoreProperties(ignoreUnknown = true)
data class DeathRecord @JsonCreator constructor(
        @JsonProperty("DATE")
        override val date: String?,
        @JsonProperty("REGION")
        override val region: String?,
        @JsonProperty("DEATHS")
        val deaths: Int
) : RegionRecord