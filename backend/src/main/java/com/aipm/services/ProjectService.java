package com.aipm.services;
import com.aipm.models.Project;
import com.aipm.repositories.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ProjectService {
    @Autowired
    private ProjectRepository repository;

    public List<Project> findAll() { return repository.findAll(); }
    public Optional<Project> findById(Long id) { return repository.findById(id); }
    public Project save(Project entity) { return repository.save(entity); }
    public void deleteById(Long id) { repository.deleteById(id); }
}
