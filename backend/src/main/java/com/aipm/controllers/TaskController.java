package com.aipm.controllers;
import com.aipm.models.Task;
import com.aipm.services.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    @Autowired
    private TaskService service;

    @GetMapping
    public List<Task> getAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public Task getById(@PathVariable Long id) { return service.findById(id).orElse(null); }

    @PostMapping
    public Task create(@RequestBody Task entity) { return service.save(entity); }

    @PutMapping("/{id}")
    public Task update(@PathVariable Long id, @RequestBody Task entity) { 
        entity.setId(id);
        return service.save(entity); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
