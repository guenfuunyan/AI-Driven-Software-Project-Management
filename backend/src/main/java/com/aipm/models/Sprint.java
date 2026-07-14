package com.aipm.models;
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
