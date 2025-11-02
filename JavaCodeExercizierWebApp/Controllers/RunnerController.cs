using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text;
using System.Text.Json;

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
            public Dictionary<string, string> Files { get; set; } = new();
            public string Main { get; set; } = "App";
        }

        [HttpPost("run")]
        public async Task<IActionResult> Run([FromBody] RunRequest req)
        {
            var tmp = Path.Combine(Path.GetTempPath(), "javac-run-" + Guid.NewGuid());
            Directory.CreateDirectory(tmp);

            try
            {
                // 1️⃣ Scrivi i sorgenti
                foreach (var kv in req.Files)
                {
                    var filePath = Path.Combine(tmp, kv.Key);
                    Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
                    await System.IO.File.WriteAllTextAsync(filePath, kv.Value, new UTF8Encoding(false));
                }

                // 2️⃣ Compila
                var javacPath = JAVA.EndsWith("java.exe") ? JAVA.Replace("java.exe", "javac.exe") : JAVA.Replace("java", "javac");
                var toCompile = string.Join(" ", req.Files.Keys.Select(f => Path.Combine(tmp, f)));
                var compile = await RunProcess(javacPath, $"-Xlint:all {toCompile}", tmp);

                if (compile.Code != 0)
                {
                    return Ok(new
                    {
                        ok = false,
                        phase = "compile",
                        code = compile.Code,
                        stdout = compile.Stdout,
                        stderr = compile.Stderr
                    });
                }

                // 3️⃣ Esegui
                var run = await RunProcess(JAVA, $"-cp \"{tmp}\" {req.Main}", tmp, timeoutMs: 3000);

                return Ok(new
                {
                    ok = run.Code == 0,
                    phase = "run",
                    code = run.Code,
                    stdout = run.Stdout,
                    stderr = run.Stderr
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

            var proc = new Process { StartInfo = psi };
            var stdout = new StringBuilder();
            var stderr = new StringBuilder();

            proc.OutputDataReceived += (_, e) => { if (e.Data != null) stdout.AppendLine(e.Data); };
            proc.ErrorDataReceived += (_, e) => { if (e.Data != null) stderr.AppendLine(e.Data); };

            proc.Start();
            proc.BeginOutputReadLine();
            proc.BeginErrorReadLine();

            var finished = await Task.Run(() => proc.WaitForExit(timeoutMs));
            if (!finished)
            {
                try { proc.Kill(); } catch { }
            }

            return (proc.ExitCode, stdout.ToString(), stderr.ToString());
        }
    }
}
