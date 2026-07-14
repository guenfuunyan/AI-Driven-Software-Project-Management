package com.aipm.models;
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
