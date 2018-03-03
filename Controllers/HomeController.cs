using Microsoft.AspNetCore.Mvc;

namespace Flappy.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
