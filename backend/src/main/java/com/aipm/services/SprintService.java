package com.aipm.services;
import com.aipm.models.Sprint;
import com.aipm.repositories.SprintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SprintService {
    @Autowired
    private SprintRepository repository;

    public List<Sprint> findAll() { return repository.findAll(); }
    public Optional<Sprint> findById(Long id) { return repository.findById(id); }
    public Sprint save(Sprint entity) { return repository.save(entity); }
    public void deleteById(Long id) { repository.deleteById(id); }
}
