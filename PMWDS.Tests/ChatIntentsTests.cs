using FluentAssertions;
using PMWDS.Application.Common;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// Tests for chat intent detection.
///
/// This is the root cause of the assistant refusing to answer. The original
/// detector used bare substring Contains on a lowercased message, so "tell me about
/// all the projects" matched no rule at all, fell through to General, and General
/// produced no context data. The model was asked to answer with nothing attached and
/// correctly replied that it had no access to any project data.
///
/// The reported questions are the exact ones that failed in production, so they are
/// the assertions here.
/// </summary>
public class ChatIntentsTests
{
    [Theory]
    // The two questions from the bug report, verbatim.
    [InlineData("tell me about all the projects")]
    [InlineData("tell me about the projects")]
    [InlineData("list all projects")]
    [InlineData("show me every project")]
    [InlineData("what are our projects")]
    [InlineData("give me an overview of the portfolio")]
    public void Enumeration_of_projects_is_not_General(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.ProjectList);

    [Theory]
    [InlineData("what is the status of everything")]
    [InlineData("how are projects going")]
    [InlineData("project progress")]
    [InlineData("which projects have a health score")]
    public void Project_status_questions_are_recognised(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.ProjectStatus);

    [Theory]
    [InlineData("which projects are delayed")]
    [InlineData("what is at risk")]
    [InlineData("anything overdue")]
    [InlineData("show me blocked work")]
    [InlineData("what is behind schedule")]
    public void Risk_questions_win_over_project_enumeration(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.DelayAnalysis);

    [Theory]
    [InlineData("list all tasks")]
    [InlineData("show my subtasks")]
    [InlineData("what is on my todo list")]
    [InlineData("what tasks are assigned to me")]
    public void Task_questions_are_recognised(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.TaskQuery);

    [Theory]
    [InlineData("list the milestones")]
    [InlineData("show me all deadlines")]
    [InlineData("what is on the timeline")]
    public void Milestone_questions_are_recognised(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.MilestoneQuery);

    [Theory]
    [InlineData("show me all documents")]
    [InlineData("list the contracts")]
    [InlineData("what files are attached")]
    [InlineData("show me the utilization certificates")]
    public void Document_questions_are_recognised(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.DocumentQuery);

    [Theory]
    [InlineData("who is overloaded")]
    [InlineData("show team workload")]
    [InlineData("who has capacity")]
    [InlineData("check burnout risk")]
    public void Resource_questions_are_recognised(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.ResourceManagement);

    [Theory]
    [InlineData("what is the budget situation")]
    [InlineData("show cost variance")]
    [InlineData("how much have we spent")]
    public void Budget_questions_are_recognised(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.BudgetQuery);

    [Theory]
    [InlineData("who should take this task")]
    [InlineData("assign this to someone")]
    [InlineData("reassign the work")]
    public void Assignment_questions_are_recognised(string message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.TaskAssignment);

    [Fact]
    public void An_unrecognised_question_falls_back_to_General()
    {
        // General is fine as long as the context builder still supplies data for it.
        // The original failure was not that the intent was General, it was that
        // General produced no context at all.
        ChatIntents.Detect("what do you think").Should().Be(ChatIntents.General);
        ChatIntents.Detect("hello").Should().Be(ChatIntents.General);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Empty_input_is_General_rather_than_throwing(string? message)
        => ChatIntents.Detect(message).Should().Be(ChatIntents.General);

    [Theory]
    // Substring matching was the second half of the original bug: "status" matched
    // inside "estimate", "risk" inside "brisk", "cost" inside "customer". Each of
    // these would file the question under the wrong intent and fetch the wrong slice
    // of data.
    [InlineData("can you give me an estimate", ChatIntents.General)]
    [InlineData("what is the customer list", ChatIntents.General)]
    [InlineData("the weather looks brisk today", ChatIntents.General)]
    public void Substrings_do_not_trigger_an_intent(string message, string expected)
        => ChatIntents.Detect(message).Should().Be(expected);

    [Fact]
    public void Detection_is_case_insensitive()
    {
        ChatIntents.Detect("SHOW ME ALL PROJECTS").Should().Be(ChatIntents.ProjectList);
        ChatIntents.Detect("Which Projects Are Delayed?").Should().Be(ChatIntents.DelayAnalysis);
    }

    [Fact]
    public void Every_intent_offers_suggested_actions()
    {
        // The old code offered "Go to Dashboard" for General, which was the only
        // action ever shown for the reported questions.
        foreach (var intent in ChatIntents.All)
        {
            var actions = ChatIntents.SuggestedActions(intent);
            actions.Should().NotBeEmpty();
            actions.Should().NotContain("Go to Dashboard");
        }
    }

    [Fact]
    public void The_assistant_is_read_only_so_nothing_needs_confirmation()
    {
        // Kept as an explicit assertion because the old code returned true for
        // TaskAssignment, implying the assistant could act. It cannot.
        foreach (var intent in ChatIntents.All)
        {
            ChatIntents.NeedsConfirmation(intent).Should().BeFalse();
        }
    }
}
