import os

entities = ["User", "Project", "Sprint", "UserStory", "Task"]
base_pkg = "com.aipm"
backend_dir = "backend/src/main/java/com/aipm"

os.makedirs(f"{backend_dir}/repositories", exist_ok=True)
os.makedirs(f"{backend_dir}/services", exist_ok=True)
os.makedirs(f"{backend_dir}/controllers", exist_ok=True)

for entity in entities:
    # Repository
    repo_content = f"""package {base_pkg}.repositories;
import {base_pkg}.models.{entity};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface {entity}Repository extends JpaRepository<{entity}, Long> {{
}}
"""
    with open(f"{backend_dir}/repositories/{entity}Repository.java", "w") as f:
        f.write(repo_content)

    # Service
    service_content = f"""package {base_pkg}.services;
import {base_pkg}.models.{entity};
import {base_pkg}.repositories.{entity}Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class {entity}Service {{
    @Autowired
    private {entity}Repository repository;

    public List<{entity}> findAll() {{ return repository.findAll(); }}
    public Optional<{entity}> findById(Long id) {{ return repository.findById(id); }}
    public {entity} save({entity} entity) {{ return repository.save(entity); }}
    public void deleteById(Long id) {{ repository.deleteById(id); }}
}}
"""
    with open(f"{backend_dir}/services/{entity}Service.java", "w") as f:
        f.write(service_content)

    # Controller
    controller_content = f"""package {base_pkg}.controllers;
import {base_pkg}.models.{entity};
import {base_pkg}.services.{entity}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/{entity.lower()}s")
public class {entity}Controller {{
    @Autowired
    private {entity}Service service;

    @GetMapping
    public List<{entity}> getAll() {{ return service.findAll(); }}

    @GetMapping("/{{id}}")
    public {entity} getById(@PathVariable Long id) {{ return service.findById(id).orElse(null); }}

    @PostMapping
    public {entity} create(@RequestBody {entity} entity) {{ return service.save(entity); }}

    @PutMapping("/{{id}}")
    public {entity} update(@PathVariable Long id, @RequestBody {entity} entity) {{ 
        entity.setId(id);
        return service.save(entity); 
    }}

    @DeleteMapping("/{{id}}")
    public void delete(@PathVariable Long id) {{ service.deleteById(id); }}
}}
"""
    with open(f"{backend_dir}/controllers/{entity}Controller.java", "w") as f:
        f.write(controller_content)

print("Spring Boot Repositories, Services, and Controllers generated successfully!")
