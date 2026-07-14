package com.aipm.models;
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
