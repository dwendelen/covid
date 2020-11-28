package se.daan.covid

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.web.client.RestTemplate
import java.time.Clock
import java.time.ZoneId

@SpringBootApplication
@EnableScheduling
class CovidApplication {
    @Bean
    fun restTemplate() = RestTemplate()
    @Bean
    fun clock(@Value("\${clock.zone}") zone: String): Clock =
            Clock.system(ZoneId.of(zone))
}

fun main(args: Array<String>) {
	runApplication<CovidApplication>(*args)
}
