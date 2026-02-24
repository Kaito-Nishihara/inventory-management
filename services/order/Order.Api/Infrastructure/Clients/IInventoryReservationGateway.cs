namespace Order.Api.Infrastructure.Clients;

public interface IInventoryReservationGateway
{
    Task<ReserveResult> ReserveAsync(Guid productId, int quantity, CancellationToken cancellationToken = default);
}

public sealed record ReserveResult(bool Success, string ErrorCode);
