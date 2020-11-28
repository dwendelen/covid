package se.daan.covid

import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class Controller(
        private val dataService: DataService
) {
    @GetMapping("/ready")
    fun ready(): ResponseEntity<Nothing> {
        return if (dataService.isReady()) {
            ResponseEntity.status(200).build();
        } else {
            ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/data")
    fun getData(): ResponseEntity<Data> {
        return dataService.getData()
                ?.let { ResponseEntity.ok(it) }
                ?: ResponseEntity.status(500).build()
    }
}