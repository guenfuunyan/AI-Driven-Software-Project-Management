package com.aipm.services;
import com.aipm.models.Task;
import com.aipm.repositories.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class TaskService {
    @Autowired
    private TaskRepository repository;

    public List<Task> findAll() { return repository.findAll(); }
    public Optional<Task> findById(Long id) { return repository.findById(id); }
    public Task save(Task entity) { return repository.save(entity); }
    public void deleteById(Long id) { repository.deleteById(id); }
}
