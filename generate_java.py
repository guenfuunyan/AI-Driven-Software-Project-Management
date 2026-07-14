import os

java_dir = "backend/src/main/java/com/aipm/models"
os.makedirs(java_dir, exist_ok=True)

models = {
    "User": """package com.aipm.models;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private LocalDateTime createdAt = LocalDateTime.now();
}
""",
    "Project": """package com.aipm.models;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
@Data
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String description;
    private String status;
    private Long ownerId;
    private LocalDateTime createdAt = LocalDateTime.now();
}
""",
    "Sprint": """package com.aipm.models;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "sprints")
@Data
public class Sprint {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long projectId;
    private String name;
    private String goal;
    private String status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}
""",
    "UserStory": """package com.aipm.models;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_stories")
@Data
public class UserStory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long projectId;
    private Long sprintId;
    private String title;
    private String description;
    private String status;
    private Integer storyPoints;
    private Long assigneeId;
}
""",
    "Task": """package com.aipm.models;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Data
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long projectId;
    private Long sprintId;
    private Long storyId;
    private String title;
    private String description;
    private String status;
    private Integer storyPoints;
    private Long assigneeId;
    private Double automationLevel;
    private Double riskLevel;
}
"""
}

for name, content in models.items():
    with open(f"{java_dir}/{name}.java", "w") as f:
        f.write(content)

print("Java entities generated successfully!")
