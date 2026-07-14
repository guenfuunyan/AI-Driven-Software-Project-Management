package com.aipm.controllers;
import com.aipm.models.Project;
import com.aipm.services.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    @Autowired
    private ProjectService service;

    @GetMapping
    public List<Project> getAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public Project getById(@PathVariable Long id) { return service.findById(id).orElse(null); }

    @PostMapping
    public Project create(@RequestBody Project entity) { return service.save(entity); }

    @PutMapping("/{id}")
    public Project update(@PathVariable Long id, @RequestBody Project entity) { 
        entity.setId(id);
        return service.save(entity); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
