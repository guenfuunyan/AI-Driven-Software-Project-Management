package com.aipm.controllers;
import com.aipm.models.Sprint;
import com.aipm.services.SprintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/sprints")
public class SprintController {
    @Autowired
    private SprintService service;

    @GetMapping
    public List<Sprint> getAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public Sprint getById(@PathVariable Long id) { return service.findById(id).orElse(null); }

    @PostMapping
    public Sprint create(@RequestBody Sprint entity) { return service.save(entity); }

    @PutMapping("/{id}")
    public Sprint update(@PathVariable Long id, @RequestBody Sprint entity) { 
        entity.setId(id);
        return service.save(entity); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
