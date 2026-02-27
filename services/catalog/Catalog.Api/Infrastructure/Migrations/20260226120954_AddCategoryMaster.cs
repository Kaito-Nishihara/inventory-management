using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryMaster : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var peripheralsId = new Guid("11111111-1111-1111-1111-111111111111");
            var displayId = new Guid("22222222-2222-2222-2222-222222222222");
            var otherId = new Guid("33333333-3333-3333-3333-333333333333");

            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                schema: "catalog",
                table: "products",
                type: "uuid",
                nullable: false,
                defaultValue: otherId);

            migrationBuilder.CreateTable(
                name: "categories",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "catalog",
                table: "categories",
                columns: new[] { "Id", "Key", "Name", "SortOrder", "IsActive" },
                values: new object[,]
                {
                    { peripheralsId, "peripherals", "周辺機器", 10, true },
                    { displayId, "display", "ディスプレイ", 20, true },
                    { otherId, "other", "その他", 30, true }
                });

            migrationBuilder.Sql($"""
                UPDATE catalog.products
                SET "CategoryId" = '{otherId}'
                WHERE "CategoryId" = '00000000-0000-0000-0000-000000000000';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_products_CategoryId",
                schema: "catalog",
                table: "products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_categories_IsActive_SortOrder",
                schema: "catalog",
                table: "categories",
                columns: new[] { "IsActive", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_categories_Key",
                schema: "catalog",
                table: "categories",
                column: "Key",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_products_categories_CategoryId",
                schema: "catalog",
                table: "products",
                column: "CategoryId",
                principalSchema: "catalog",
                principalTable: "categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_categories_CategoryId",
                schema: "catalog",
                table: "products");

            migrationBuilder.DropTable(
                name: "categories",
                schema: "catalog");

            migrationBuilder.DropIndex(
                name: "IX_products_CategoryId",
                schema: "catalog",
                table: "products");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                schema: "catalog",
                table: "products");
        }
    }
}
