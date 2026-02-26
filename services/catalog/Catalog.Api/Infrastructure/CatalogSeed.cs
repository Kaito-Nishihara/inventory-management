using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure;

public static class CatalogSeed
{
    /// <summary>
    /// 開発用の公開商品サンプルを投入します。
    /// </summary>
    /// <param name="db">Catalog DBコンテキストです。</param>
    /// <returns>非同期タスクです。</returns>
    public static async Task SeedDefaultsAsync(CatalogDbContext db)
    {
        var samples = new[]
        {
            new SampleProduct("メカニカルキーボード", "80%配列のメカニカルキーボード", 12800m, 25),
            new SampleProduct("ゲーミングマウス", "軽量ワイヤレスマウス", 6980m, 40),
            new SampleProduct("27インチモニター", "QHD IPSモニター", 39800m, 12)
        };

        foreach (var sample in samples)
        {
            var product = await db.Products.SingleOrDefaultAsync(x => x.Name == sample.Name);
            if (product is null)
            {
                var created = CreatePublishedProduct(sample.Name, sample.Description, sample.Price, sample.OnHand);
                db.Products.Add(created.Product);
                db.InventoryItems.Add(created.Inventory);
                continue;
            }

            product.Update(sample.Name, sample.Description, sample.Price);
            if (!product.IsPublished)
            {
                product.SetPublished(true);
            }

            var inventory = await db.InventoryItems.SingleOrDefaultAsync(x => x.ProductId == product.Id);
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

        await db.SaveChangesAsync();
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
        string name,
        string description,
        decimal price,
        int onHand)
    {
        var product = Product.Create(name, description, price);
        product.SetPublished(true);

        var inventory = InventoryItem.Create(product.Id);
        inventory.TryReceive(onHand);

        return (product, inventory);
    }

    private sealed record SampleProduct(string Name, string Description, decimal Price, int OnHand);
}
