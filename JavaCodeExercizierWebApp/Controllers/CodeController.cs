using JavaCodeExercizierWebApp.Models;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace JavaCodeExercizierWebApp.Controllers
{
    public class CodeController : Controller
    {
        private readonly ILogger<CodeController> _logger;

        public CodeController(ILogger<CodeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {
            return View();
        }
        public IActionResult Editor(string name)
        {
            if(!System.IO.File.Exists("wwwroot/java/" + name + ".java")) return NotFound();
            var data = System.IO.File.ReadAllText("wwwroot/java/" + name + ".java");
            var model = new EditorViewModel
            {
                Name = name,
                Java = data
            };
            return View(model);
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
