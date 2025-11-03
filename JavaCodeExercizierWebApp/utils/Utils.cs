using System.Text.RegularExpressions;

namespace JavaCodeExercizierWebApp.utils
{
    public static class Utils
    {
        private static readonly Regex ImportLine =
        new(@"^[ \t]*import\s+(?:static\s+)?[A-Za-z_][\w\.]*(?:\.\*)?\s*;\s*$",
            RegexOptions.Multiline | RegexOptions.CultureInvariant);

        public static string NormalizeImports(this string javaSource, bool sortImports = true)
        {
            if (string.IsNullOrWhiteSpace(javaSource))
                return javaSource ?? string.Empty;
            var imports = new List<string>();
            foreach (Match m in ImportLine.Matches(javaSource))
                imports.Add(m.Value.Trim());
            if (imports.Count == 0)
                return javaSource; 
            var withoutImports = ImportLine.Replace(javaSource, string.Empty);
            IEnumerable<string> unique = imports.Distinct(StringComparer.Ordinal);
            if (sortImports) unique = unique.OrderBy(s => s, StringComparer.Ordinal);
            var importBlock = string.Join("\n", unique) + "\n";
            var result = importBlock + "\n" + withoutImports.TrimStart();
            return result.TrimEnd() + "\n";
        }
    }
}
