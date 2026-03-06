using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationTransferStatusWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ReceivedAtUtc",
                schema: "catalog",
                table: "location_inventory_transfers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShippedAtUtc",
                schema: "catalog",
                table: "location_inventory_transfers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "catalog",
                table: "location_inventory_transfers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "移動指示");

            migrationBuilder.CreateIndex(
                name: "IX_location_inventory_transfers_Status",
                schema: "catalog",
                table: "location_inventory_transfers",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_location_inventory_transfers_Status",
                schema: "catalog",
                table: "location_inventory_transfers");

            migrationBuilder.DropColumn(
                name: "ReceivedAtUtc",
                schema: "catalog",
                table: "location_inventory_transfers");

            migrationBuilder.DropColumn(
                name: "ShippedAtUtc",
                schema: "catalog",
                table: "location_inventory_transfers");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "catalog",
                table: "location_inventory_transfers");
        }
    }
}
