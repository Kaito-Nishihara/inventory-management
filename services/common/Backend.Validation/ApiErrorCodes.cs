namespace Backend.Validation;

public static class ApiErrorCodes
{
    public const string ValidationError = "validation_error";
    public const string DuplicateEmail = "duplicate_email";
    public const string InvalidCredentials = "invalid_credentials";
    public const string InvalidOrExpiredRefreshToken = "invalid_or_expired_refresh_token";
    public const string ProductNotFound = "product_not_found";
    public const string OrderNotFound = "order_not_found";
    public const string InvalidQuantity = "invalid_quantity";
    public const string InvalidRequest = "invalid_request";
    public const string InvalidStatus = "invalid_status";
    public const string InvalidTransition = "invalid_transition";
    public const string InvalidOnHand = "invalid_on_hand";
    public const string InsufficientAvailable = "insufficient_available";
    public const string InsufficientStock = "insufficient_stock";
    public const string VersionConflict = "version_conflict";
    public const string ConcurrencyConflict = "concurrency_conflict";
    public const string InventoryReleaseFailed = "inventory_release_failed";
    public const string TransferNotFound = "transfer_not_found";
    public const string LocationNotFound = "location_not_found";
}
