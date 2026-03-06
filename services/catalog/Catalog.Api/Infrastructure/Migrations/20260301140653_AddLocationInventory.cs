using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "location_inventory_items",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocationId = table.Column<Guid>(type: "uuid", nullable: false),
                    OnHand = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_location_inventory_items", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "location_inventory_transfers",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromLocationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToLocationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Note = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_location_inventory_transfers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "stock_locations",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_locations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_location_inventory_items_LocationId",
                schema: "catalog",
                table: "location_inventory_items",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_location_inventory_items_ProductId",
                schema: "catalog",
                table: "location_inventory_items",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_location_inventory_items_ProductId_LocationId",
                schema: "catalog",
                table: "location_inventory_items",
                columns: new[] { "ProductId", "LocationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_location_inventory_transfers_CreatedAtUtc",
                schema: "catalog",
                table: "location_inventory_transfers",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_location_inventory_transfers_FromLocationId",
                schema: "catalog",
                table: "location_inventory_transfers",
                column: "FromLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_location_inventory_transfers_ProductId",
                schema: "catalog",
                table: "location_inventory_transfers",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_location_inventory_transfers_ToLocationId",
                schema: "catalog",
                table: "location_inventory_transfers",
                column: "ToLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_locations_Code",
                schema: "catalog",
                table: "stock_locations",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "location_inventory_items",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "location_inventory_transfers",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "stock_locations",
                schema: "catalog");
        }
    }
}
