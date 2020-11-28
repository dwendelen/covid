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
import java.lang.Exception
import java.time.Clock
import java.time.ZonedDateTime
import java.util.concurrent.atomic.AtomicReference


@Component
class DataService(
        private val restTemplate: RestTemplate,
        private val clock: Clock,
        @Value("\${data.newCases.url}") private val newCasesUrl: String,
        @Value("\${data.hospital.url}") private val hospitalUrl: String,
        @Value("\${data.deaths.url}") private val deathsUrl: String,
        @Value("\${data.skipLast}") private val skipLast: Int,
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
            val cases = restTemplate.getForObject("https://epistat.sciensano.be/Data/COVID19BE_CASES_AGESEX.json", Array<CasesRecord>::class.java)
            val hospital = restTemplate.getForObject("https://epistat.sciensano.be/Data/COVID19BE_HOSP.json", Array<HospitalRecord>::class.java)
            val death = restTemplate.getForObject("https://epistat.sciensano.be/Data/COVID19BE_MORT.json", Array<DeathRecord>::class.java)

            if(cases == null || hospital == null || death == null) {
                return //TODO
            }

            val cases2 = cases.groupBy { it.date }
            val hospital2 = hospital.groupBy { it.date }
            val death2 = death.groupBy { it.date }

            val dataPoints = (cases2.keys + hospital2.keys + death2.keys)
                    .filterNotNull()
                    .sorted()
                    .dropLast(skipLast)
                    .map { key ->
                        val newCases = cases2.getOrDefault(key, emptyList())
                                .map { it.cases }
                                .sum()
                        val hospitalTotal = hospital2.getOrDefault(key, emptyList())
                                .map {it.total}
                                .sum()
                        val hospitalNew = hospital2.getOrDefault(key, emptyList())
                                .map {it.newIn}
                                .sum()
                        val hospitalIcu = hospital2.getOrDefault(key, emptyList())
                                .map {it.icu}
                                .sum()
                        val deaths = death2.getOrDefault(key, emptyList())
                                .map{it.deaths}
                                .sum()
                        DataPoint(key, newCases, hospitalTotal, hospitalIcu, hospitalNew, deaths)
                    }
            loadedData.set(Data(timestamp, dataPoints))
        } catch (e: Exception) {
            //TODO
        }
    }
}

data class Data(
        @JsonProperty("timestamp")
        val timestamp: ZonedDateTime,
        @JsonProperty("dataPoints")
        val dataPoints: List<DataPoint>
)

data class DataPoint(
        @JsonProperty("date")
        val date: String,
        @JsonProperty("newCases")
        val newCases: Int,
        @JsonProperty("hospital")
        val hospital: Int,
        @JsonProperty("icu")
        val icu: Int,
        @JsonProperty("admissions")
        val admissions: Int,
        @JsonProperty("deaths")
        val deaths: Int
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class CasesRecord(
        @JsonProperty("DATE")
        val date: String?,
        @JsonProperty("PROVINCE")
        val province: String?,
        @JsonProperty("REGION")
        val region: String?,
        @JsonProperty("CASES")
        val cases: Int
)

@JsonIgnoreProperties(ignoreUnknown = true)

data class HospitalRecord(
        @JsonProperty("DATE")
        val date: String?,
        @JsonProperty("PROVINCE")
        val province: String?,
        @JsonProperty("REGION")
        val region: String?,
        @JsonProperty("TOTAL_IN")
        val total: Int,
        @JsonProperty("TOTAL_IN_ICU")
        val icu: Int,
        @JsonProperty("NEW_IN")
        val newIn: Int
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class DeathRecord @JsonCreator constructor(
        @JsonProperty("DATE")
        val date: String?,
        @JsonProperty("REGION")
        val region: String?,
        @JsonProperty("DEATHS")
        val deaths: Int
)