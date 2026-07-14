package com.aipm.controllers;
import com.aipm.models.UserStory;
import com.aipm.services.UserStoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/userstorys")
public class UserStoryController {
    @Autowired
    private UserStoryService service;

    @GetMapping
    public List<UserStory> getAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public UserStory getById(@PathVariable Long id) { return service.findById(id).orElse(null); }

    @PostMapping
    public UserStory create(@RequestBody UserStory entity) { return service.save(entity); }

    @PutMapping("/{id}")
    public UserStory update(@PathVariable Long id, @RequestBody UserStory entity) { 
        entity.setId(id);
        return service.save(entity); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
