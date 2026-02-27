using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure;

public static class CatalogSeed
{
    private const string BulkProductPrefix = "負荷検証商品-";

    /// <summary>
    /// 開発用の公開商品サンプルを投入します。
    /// </summary>
    /// <param name="db">Catalog DBコンテキストです。</param>
    /// <param name="bulkProductCount">追加投入する大量データ件数です。0以下の場合は投入しません。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期タスクです。</returns>
    public static async Task SeedDefaultsAsync(
        CatalogDbContext db,
        int bulkProductCount = 0,
        CancellationToken cancellationToken = default)
    {
        var categoryMap = await EnsureCategoriesAsync(db, cancellationToken);
        var samples = new[]
        {
            new SampleProduct("peripherals", "メカニカルキーボード", "80%配列のメカニカルキーボード", 12800m, 25),
            new SampleProduct("peripherals", "ゲーミングマウス", "軽量ワイヤレスマウス", 6980m, 40),
            new SampleProduct("display", "27インチモニター", "QHD IPSモニター", 39800m, 12)
        };

        foreach (var sample in samples)
        {
            var categoryId = categoryMap[sample.CategoryKey];
            var product = await db.Products.SingleOrDefaultAsync(x => x.Name == sample.Name, cancellationToken);
            if (product is null)
            {
                var created = CreatePublishedProduct(categoryId, sample.Name, sample.Description, sample.Price, sample.OnHand);
                db.Products.Add(created.Product);
                db.InventoryItems.Add(created.Inventory);
                continue;
            }

            product.Update(categoryId, sample.Name, sample.Description, sample.Price);
            if (!product.IsPublished)
            {
                product.SetPublished(true);
            }

            var inventory = await db.InventoryItems.SingleOrDefaultAsync(x => x.ProductId == product.Id, cancellationToken);
            if (inventory is null)
            {
                var createdInventory = InventoryItem.Create(product.Id);
                createdInventory.TryReceive(sample.OnHand);
                db.InventoryItems.Add(createdInventory);
                continue;
            }

            if (inventory.OnHand < sample.OnHand)
            {
                inventory.TryReceive(sample.OnHand - inventory.OnHand);
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        if (bulkProductCount > 0)
        {
            await SeedBulkProductsAsync(db, categoryMap, bulkProductCount, cancellationToken);
        }
    }

    /// <summary>
    /// 公開状態の商品と在庫を作成します。
    /// </summary>
    /// <param name="name">商品名です。</param>
    /// <param name="description">説明です。</param>
    /// <param name="price">価格です。</param>
    /// <param name="onHand">手持ち在庫数です。</param>
    /// <returns>商品と在庫です。</returns>
    private static (Product Product, InventoryItem Inventory) CreatePublishedProduct(
        Guid categoryId,
        string name,
        string description,
        decimal price,
        int onHand)
    {
        var product = Product.Create(categoryId, name, description, price);
        product.SetPublished(true);

        var inventory = InventoryItem.Create(product.Id);
        inventory.TryReceive(onHand);

        return (product, inventory);
    }

    /// <summary>
    /// 負荷検証用の大量商品データを投入します。
    /// </summary>
    /// <param name="db">Catalog DBコンテキストです。</param>
    /// <param name="categoryMap">カテゴリキーとIDの対応です。</param>
    /// <param name="targetCount">投入対象件数です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期タスクです。</returns>
    private static async Task SeedBulkProductsAsync(
        CatalogDbContext db,
        IReadOnlyDictionary<string, Guid> categoryMap,
        int targetCount,
        CancellationToken cancellationToken)
    {
        var existingCount = await db.Products
            .AsNoTracking()
            .CountAsync(x => EF.Functions.Like(x.Name, $"{BulkProductPrefix}%"), cancellationToken);

        if (existingCount >= targetCount)
        {
            return;
        }

        var batchProducts = new List<Product>(1000);
        var batchInventories = new List<InventoryItem>(1000);
        var categoryIds = categoryMap.Values.ToArray();
        var start = existingCount + 1;

        for (var index = start; index <= targetCount; index++)
        {
            var categoryId = categoryIds[(index - 1) % categoryIds.Length];
            var name = $"{BulkProductPrefix}{index:D6}";
            var description = $"負荷検証データ {index:D6}";
            var price = 1000m + (index % 900) * 10m;
            var onHand = 10 + (index % 200);

            var created = CreatePublishedProduct(categoryId, name, description, price, onHand);
            batchProducts.Add(created.Product);
            batchInventories.Add(created.Inventory);

            if (batchProducts.Count >= 1000 || index == targetCount)
            {
                db.Products.AddRange(batchProducts);
                db.InventoryItems.AddRange(batchInventories);
                await db.SaveChangesAsync(cancellationToken);
                batchProducts.Clear();
                batchInventories.Clear();
            }
        }
    }

    private static async Task<Dictionary<string, Guid>> EnsureCategoriesAsync(CatalogDbContext db, CancellationToken cancellationToken)
    {
        var seeds = new[]
        {
            new CategorySeed("peripherals", "周辺機器", 10),
            new CategorySeed("display", "ディスプレイ", 20),
            new CategorySeed("other", "その他", 30),
        };

        foreach (var seed in seeds)
        {
            var current = await db.Categories.SingleOrDefaultAsync(x => x.Key == seed.Key, cancellationToken);
            if (current is null)
            {
                db.Categories.Add(Category.Create(seed.Key, seed.Name, seed.SortOrder));
                continue;
            }

            current.Update(seed.Name, seed.SortOrder, true);
        }

        await db.SaveChangesAsync(cancellationToken);

        return await db.Categories
            .Where(x => x.IsActive)
            .ToDictionaryAsync(x => x.Key, x => x.Id, cancellationToken);
    }

    private sealed record CategorySeed(string Key, string Name, int SortOrder);
    private sealed record SampleProduct(string CategoryKey, string Name, string Description, decimal Price, int OnHand);
}
