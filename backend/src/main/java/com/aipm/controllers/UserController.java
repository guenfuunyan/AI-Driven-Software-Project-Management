package com.aipm.controllers;
import com.aipm.models.User;
import com.aipm.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserService service;

    @GetMapping
    public List<User> getAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public User getById(@PathVariable Long id) { return service.findById(id).orElse(null); }

    @PostMapping
    public User create(@RequestBody User entity) { return service.save(entity); }

    @PutMapping("/{id}")
    public User update(@PathVariable Long id, @RequestBody User entity) { 
        entity.setId(id);
        return service.save(entity); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
