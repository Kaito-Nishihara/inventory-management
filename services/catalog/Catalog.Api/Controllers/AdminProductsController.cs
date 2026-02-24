using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("admin/products")]
public class AdminProductsController : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "admin")]
    public IActionResult CreateProduct()
    {
        return Ok("Product created");
    }
}
