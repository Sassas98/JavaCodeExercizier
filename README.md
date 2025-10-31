# JavaCodeExercizier
Semplice progetto in react per generare un coderunner per java, al fine di far fare esercizi basilari.

Il backend funziona tramite Json contenenti il codice, tipo:
{
  "main": "Hello",
  "files": {
    "Hello.java": "public class Hello { public static void main(String[] args) { Printer.print(\"ciao mondo!\"); } }",
    "Printer.java": "public class Printer { public static void print(String line) { System.out.print(line); } }"
  }
}
