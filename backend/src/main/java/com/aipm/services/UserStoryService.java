package com.aipm.services;
import com.aipm.models.UserStory;
import com.aipm.repositories.UserStoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UserStoryService {
    @Autowired
    private UserStoryRepository repository;

    public List<UserStory> findAll() { return repository.findAll(); }
    public Optional<UserStory> findById(Long id) { return repository.findById(id); }
    public UserStory save(UserStory entity) { return repository.save(entity); }
    public void deleteById(Long id) { repository.deleteById(id); }
}
