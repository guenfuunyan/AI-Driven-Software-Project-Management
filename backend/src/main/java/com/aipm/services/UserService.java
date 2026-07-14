package com.aipm.services;
import com.aipm.models.User;
import com.aipm.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    @Autowired
    private UserRepository repository;

    public List<User> findAll() { return repository.findAll(); }
    public Optional<User> findById(Long id) { return repository.findById(id); }
    public User save(User entity) { return repository.save(entity); }
    public void deleteById(Long id) { repository.deleteById(id); }
}
