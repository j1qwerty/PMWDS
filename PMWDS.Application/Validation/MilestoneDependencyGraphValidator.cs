namespace PMWDS.Application.Validation;

public static class MilestoneDependencyGraphValidator
{
    public static bool WouldCreateCycle(
        IEnumerable<(Guid From, Guid To)> existingEdges,
        Guid from,
        Guid to)
    {
        if (from == to)
            return true;

        var graph = existingEdges
            .GroupBy(edge => edge.From)
            .ToDictionary(
                group => group.Key,
                group => group.Select(edge => edge.To).ToList());

        var pending = new Stack<Guid>();
        var visited = new HashSet<Guid>();
        pending.Push(to);

        while (pending.Count > 0)
        {
            var current = pending.Pop();
            if (!visited.Add(current))
                continue;

            if (current == from)
                return true;

            if (graph.TryGetValue(current, out var neighbors))
            {
                foreach (var neighbor in neighbors)
                    pending.Push(neighbor);
            }
        }

        return false;
    }
}
