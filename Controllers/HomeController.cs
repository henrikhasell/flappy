using Microsoft.AspNetCore.Mvc;

namespace Flappy.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public IActionResult Leaderboard()
        {
            return View("SubmitScore");
        }

        [HttpPost]
        public IActionResult Leaderboard([FromForm]int score, [FromForm]string name)
        {
            return View("SubmitScore");
        }
        
        public IActionResult About()
        {
            return View();
        }

        public IActionResult Share()
        {
            return View();
        }
    }
}
