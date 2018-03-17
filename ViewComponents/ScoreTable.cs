using System.Collections.Generic;
using Flappy.Models;
using Microsoft.AspNetCore.Mvc;

namespace Flappy.ViewComponents
{
    public class ScoreTable : ViewComponent
    {
        public IViewComponentResult Invoke(IList<Score> scores)
        {
            return View(scores);
        }
    }
}