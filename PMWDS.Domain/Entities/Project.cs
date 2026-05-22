using PMWDS.Domain.Common;
using PMWDS.Domain.Enums;
using PMWDS.Domain.Events;
namespace PMWDS.Domain.Entities;

public class Project : AuditableEntity
{
   // Core Properties
   public string ProjectCode { get; private set; } = string.Empty;
   public string Name { get; private set; } = string.Empty;
   public string Description { get; private set; } = string.Empty;
   public string Category { get; private set; } = string.Empty;
   public ProjectPriority Priority { get; private set; }
   public ProjectStatus Status { get; private set; }
   // Organization
   public Guid DepartmentId { get; private set; }
   public string ProjectManagerId { get; private set; } = string.Empty;
   public string? ClientName { get; private set; }
   public string? StakeholderIds { get; private set; } // JSON
                                                       // Timeline
   public DateTime PlannedStartDate { get; private set; }
   public DateTime PlannedEndDate { get; private set; }
   public DateTime? ActualStartDate { get; private set; }
   public DateTime? ActualEndDate { get; private set; }
   public DateTime BaselineEndDate { get; private set; }
   // Budget
   public decimal PlannedBudget { get; private set; }
   public decimal ActualCost { get; private set; }
   // Progress
   public double ProgressPercentage { get; private set; }
   public string? DelayJustification { get; private set; }
   // AI Fields
   public double AIHealthScore { get; private set; }
   public double AIDelayRiskScore { get; private set; }
   public double AIBudgetRiskScore { get; private set; }
   public string? AIInsightsSummary { get; private set; }
   public DateTime? LastAIAnalysis { get; private set; }
   // Navigation
   public Department? Department { get; private set; }
   public IReadOnlyCollection<Milestone> Milestones => _milestones.AsReadOnly();
   public IReadOnlyCollection<ProjectTask> Tasks => _tasks.AsReadOnly();
   public IReadOnlyCollection<ProjectDocument> Documents =>
   _documents.AsReadOnly();
   private readonly List<Milestone> _milestones = new();
   private readonly List<ProjectTask> _tasks = new();
   private readonly List<ProjectDocument> _documents = new();
   private readonly List<IDomainEvent> _domainEvents = new();
   public IReadOnlyList<IDomainEvent> DomainEvents =>
   _domainEvents.AsReadOnly();
   protected Project() { }
   public static Project Create(
   string name,
   string description,
   string category,
   ProjectPriority priority,
   Guid departmentId,
   string projectManagerId,
   DateTime plannedStartDate,
   DateTime plannedEndDate,
   decimal plannedBudget,
   string? clientName = null)
   {
      var project = new Project
      {
         ProjectCode = GenerateCode(category),
         Name = name,
         Description = description,
         Category = category,
         Priority = priority,
         Status = ProjectStatus.NotStarted,
         DepartmentId = departmentId,
         ProjectManagerId = projectManagerId,
         PlannedStartDate = plannedStartDate,
         PlannedEndDate = plannedEndDate,
         BaselineEndDate = plannedEndDate,
         PlannedBudget = plannedBudget,
         ActualCost = 0,
         ClientName = clientName,
         ProgressPercentage = 0,
         AIHealthScore = 100
      };
      project._domainEvents.Add(
      new ProjectCreatedEvent(project.Id, project.Name));
      return project;
   }
   public void Start()
   {
      if (Status != ProjectStatus.NotStarted)
         throw new InvalidOperationException(
         "Only NotStarted projects can be started.");
      Status = ProjectStatus.InProgress;
      ActualStartDate = DateTime.UtcNow;
      _domainEvents.Add(new ProjectStatusChangedEvent(
      Id, ProjectStatus.NotStarted, ProjectStatus.InProgress));
   }
   public void Complete()
   {
      Status = ProjectStatus.Completed;
      ActualEndDate = DateTime.UtcNow;
      ProgressPercentage = 100;
      _domainEvents.Add(new ProjectStatusChangedEvent(
      Id, ProjectStatus.InProgress, ProjectStatus.Completed));
   }
   public void PutOnHold(string justification)
   {
      Status = ProjectStatus.OnHold;
      DelayJustification = justification;
   }
   public void Update(
   string name,
   string description,
   string category,
   DateTime plannedStartDate,
   DateTime plannedEndDate,
   decimal plannedBudget,
   ProjectPriority priority,
   Guid departmentId,
   string projectManagerId)
   {
      Name = name;
      Description = description;
      Category = category;
      DepartmentId = departmentId;
      ProjectManagerId = projectManagerId;
      PlannedStartDate = plannedStartDate;
      PlannedEndDate = plannedEndDate;
      PlannedBudget = plannedBudget;
      Priority = priority;
   }
   public void UpdateStatus(ProjectStatus newStatus)
   {
      switch (newStatus)
      {
         case ProjectStatus.NotStarted:
            Status = ProjectStatus.NotStarted;
            ActualStartDate = null;
            ActualEndDate = null;
            break;
         case ProjectStatus.InProgress:
            if (Status == ProjectStatus.NotStarted)
               ActualStartDate = DateTime.UtcNow;
            Status = ProjectStatus.InProgress;
            break;
         case ProjectStatus.OnHold:
            Status = ProjectStatus.OnHold;
            break;
         case ProjectStatus.Completed:
            Status = ProjectStatus.Completed;
            ActualEndDate = DateTime.UtcNow;
            ProgressPercentage = 100;
            break;
         case ProjectStatus.Cancelled:
         case ProjectStatus.Delayed:
            Status = newStatus;
            break;
      }
   }
   public void UpdateTimeline(
   DateTime newEndDate, string justification)
   {
      if (newEndDate < PlannedEndDate)
         throw new InvalidOperationException(
         "New end date must be after planned end date.");
      PlannedEndDate = newEndDate;
      DelayJustification = justification;
      _domainEvents.Add(new ProjectDelayedEvent(
      Id, BaselineEndDate, newEndDate, justification));
   }
   public void UpdateProgress(double percentage)
   {
      ProgressPercentage = Math.Clamp(percentage, 0, 100);
   }
   public void AddActualCost(decimal cost)
   {
      ActualCost += cost;
      if (ActualCost > PlannedBudget * 0.9m)
         _domainEvents.Add(
         new ProjectBudgetAlertEvent(Id, ActualCost,
         PlannedBudget));
   }
   public void AddMilestone(Milestone milestone)
   => _milestones.Add(milestone);
   public void AddDocument(ProjectDocument document)
   => _documents.Add(document);
   public void UpdateAIAnalysis(
   double healthScore,
   double delayRisk,
   double budgetRisk,
   string insightsSummary)
   {
      AIHealthScore = healthScore;
      AIDelayRiskScore = delayRisk;
      AIBudgetRiskScore = budgetRisk;
      AIInsightsSummary = insightsSummary;
      LastAIAnalysis = DateTime.UtcNow;
   }
   public decimal GetBudgetVariance()
   => PlannedBudget - ActualCost;
   public int GetDelayDays()
   {
      var compareDate = ActualEndDate ?? DateTime.UtcNow;
      return compareDate > PlannedEndDate
      ? (int)(compareDate - PlannedEndDate).TotalDays
      : 0;
   }
   public bool IsOverBudget()
   => ActualCost > PlannedBudget;
   public void ClearDomainEvents()
   => _domainEvents.Clear();
   private static string GenerateCode(string category)
   {
      var prefix = category.Length >= 3
      ? category[..3].ToUpper()
      : category.ToUpper();
      return $"{prefix}-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
   }
}
