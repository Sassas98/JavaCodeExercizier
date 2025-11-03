using JavaCodeExercizierWebApp.utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;

namespace JavaCodeExercizierWebApp.Controllers
{
    [ApiController]
    public class RunnerController : ControllerBase
    {
        private readonly ILogger<RunnerController> _logger;
        private readonly string JAVA = Environment.GetEnvironmentVariable("JAVA") ?? "java";

        public RunnerController(ILogger<RunnerController> logger)
        {
            _logger = logger;
        }

        public class RunRequest
        {
            public string Java { get; set; } = "";
            public string Main { get; set; } = "App";
        }

        [HttpPost("run")]
        public async Task<ActionResult> Run([FromBody] RunRequest req)
        {
            if (!System.IO.File.Exists("wwwroot/java/Main" + req.Main)) return NotFound();
            var main = System.IO.File.ReadAllText("wwwroot/java/Main" + req.Main);
            var tester = System.IO.File.ReadAllText("wwwroot/java/Tester.java"); 
            req.Main = "Main" + req.Main;
            var mainClass = req.Main.Replace(".java", "");
            var code = $"{main}\n\n{tester}\n\n";
            int start = code.Split("\n").Length;
            code = $"{code}{req.Java}".Replace("public class", "class").Replace("class " + mainClass, "public class " + mainClass).NormalizeImports();
            var tmp = Path.Combine(Path.GetTempPath(), "javac-run-" + Guid.NewGuid());
            Directory.CreateDirectory(tmp);

            try
            {
                var filePath = Path.Combine(tmp, req.Main);
                Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
                await System.IO.File.WriteAllTextAsync(filePath, code, new UTF8Encoding(false));
                
                var javacPath = JAVA.EndsWith("java.exe") ? JAVA.Replace("java.exe", "javac.exe") : JAVA.Replace("java", "javac");
                var toCompile = Path.Combine(tmp, req.Main);
                var compile = await RunProcess(javacPath, $"-Xlint:all {toCompile}", tmp);

                if (compile.Code != 0)
                {
                    return Ok(new
                    {
                        ok = false,
                        phase = "compile",
                        code = compile.Code,
                        stdout = compile.Stdout,
                        stderr = compile.Stderr,
                        start = start
                    });
                }

                var run = await RunProcess(JAVA, $"-cp \"{tmp}\" {req.Main}", tmp);
                Console.WriteLine(run);
                return Ok(new
                {
                    ok = run.Code == 0,
                    phase = "run",
                    code = run.Code,
                    stdout = run.Stdout,
                    stderr = run.Stderr,
                    start = start
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
            finally
            {
                try { Directory.Delete(tmp, true); } catch { }
            }
        }

        private static async Task<(int Code, string Stdout, string Stderr)> RunProcess(
            string fileName, string args, string cwd, int timeoutMs = 10000)
        {
            var psi = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = args,
                WorkingDirectory = cwd,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
            var stdout = new StringBuilder();
            var stderr = new StringBuilder();

            var tcsOut = new TaskCompletionSource();
            var tcsErr = new TaskCompletionSource();

            proc.OutputDataReceived += (_, e) =>
            {
                if (e.Data == null) tcsOut.TrySetResult();
                else stdout.AppendLine(e.Data);
            };

            proc.ErrorDataReceived += (_, e) =>
            {
                if (e.Data == null) tcsErr.TrySetResult();
                else stderr.AppendLine(e.Data);
            };

            proc.Start();
            proc.BeginOutputReadLine();
            proc.BeginErrorReadLine();

            var exited = await Task.Run(() => proc.WaitForExit(timeoutMs));
            if (!exited)
            {
                try { proc.Kill(entireProcessTree: true); } catch { }
            }

            await Task.WhenAll(tcsOut.Task, tcsErr.Task);

            return (proc.ExitCode, stdout.ToString(), stderr.ToString());
        }
    }
}
