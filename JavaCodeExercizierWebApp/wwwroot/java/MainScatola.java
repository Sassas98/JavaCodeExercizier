import java.util.ArrayList;
import java.util.List;

public class MainScatola {
    public static void main(String[] args) {
        List<Tester> list = new ArrayList<>();
        list.add(new Tester("Creazione scatola con quantita' 0", () -> {new Scatola(10, 0);}, new String[]{"10","0"}, new IllegalArgumentException()));
        list.add(new Tester("Creazione scatola con volume 0", () -> {new Scatola(0, 10);}, new String[]{"0","10"}, new IllegalArgumentException()));
        list.add(new Tester("Creazione scatola", () -> {new Scatola(10, 10);}, new String[]{"10","10"}));
        list.add(new Tester("Creazione scatola", () -> {new Scatola(10, 10);}, new String[]{"10","10"}));
        
        list.add(new Tester("Aggiunta scatola", () -> {
            Scatola s1 = new Scatola(10, 10);
            Scatola s2 = new Scatola(5, 1);
            return s1.aggiungi(s2);
        }, new String[]{"Scatola [10 10]","Scatola [5 1]"}, true));
        list.add(new Tester("Aggiunta scatola", () -> {
            Scatola s1 = new Scatola(10, 10);
            Scatola s2 = new Scatola(5, 1);
            return s1.aggiungi(s2);
        }, new String[]{"Scatola [10 10]","Scatola [7 1]","Scatola [7 1]"}, true));
        list.add(new Tester("Aggiunta scatola fallita per mancanza di spazio", () -> {
            Scatola s1 = new Scatola(10, 10);
            Scatola s2 = new Scatola(6, 1);
            Scatola s3 = new Scatola(7, 1);
            s1.aggiungi(s2);
            return s1.aggiungi(s3);
        }, new String[]{"Scatola [10 10]","Scatola [6 1]","Scatola [7 1]"}, false));
        list.add(new Tester("Aggiunta scatola in una piu' piccola", () -> {
            Scatola s1 = new Scatola(10, 10);
            Scatola s2 = new Scatola(15, 1);
            return s1.aggiungi(s2);
        }, new String[]{"Scatola [10 10]","Scatola [15 1]"}, false));
        
        list.add(new Tester("Controlla numero scatola vuota", () -> {
            Scatola s1 = new Scatola(10, 10);
            return s1.numero();
        }, new String[]{"Scatola [10 10]"}, 0));
        list.add(new Tester("Controlla numero scatola contenuta", () -> {
            Scatola s1 = new Scatola(10, 10);
            Scatola s2 = new Scatola(5, 1);
            s1.aggiungi(s2);
            return s1.numero();
        }, new String[]{"Scatola [10 10]","Scatola [5 1]"}, 1));
        list.add(new Tester("Controlla numero scatole contenute", () -> {
            Scatola s1 = new Scatola(10, 10);
            Scatola s2 = new Scatola(5, 1);
            Scatola s3 = new Scatola(3, 1);
            s1.aggiungi(s2);
            s1.aggiungi(s3);
            return s1.numero();
        }, new String[]{"Scatola [10 10]","Scatola [5 1]","Scatola [3 1]"}, 2));
        list.add(new Tester("Controlla numero scatole contenute senza eccedere", () -> {
            Scatola s1 = new Scatola(10, 2);
            Scatola s2 = new Scatola(5, 1);
            Scatola s3 = new Scatola(3, 1);
            Scatola s4 = new Scatola(2, 1);
            s1.aggiungi(s2);
            s1.aggiungi(s3);
            s1.aggiungi(s4);
            return s1.numero();
        }, new String[]{"Scatola [10 10]","Scatola [5 1]","Scatola [3 1]","Scatola [2 1]"}, 2));
        
        list.add(new Tester("Controlla volume scatola", () -> {
            Scatola s1 = new Scatola(10, 10);
            return s1.getVolume();
        }, new String[]{"Scatola [10 10]"}, 10f));
        list.add(new Tester("Controlla volume scatola", () -> {
            Scatola s1 = new Scatola(1, 10);
            return s1.getVolume();
        }, new String[]{"Scatola [1 10]"}, 1f));
        list.add(new Tester("Controlla volume scatola", () -> {
            Scatola s1 = new Scatola(10000, 10);
            return s1.getVolume();
        }, new String[]{"Scatola [10000 10]"}, 10000f));

        list.add(new Tester("Controlla spazio vuoto scatola vuota", () -> {
            Scatola s1 = new Scatola(20, 10);
            return s1.libero();
        }, new String[]{"Scatola [20 10]"}, 20f));
        list.add(new Tester("Controlla spazio vuoto con dentro una scatola", () -> {
            Scatola s1 = new Scatola(35, 10);
            Scatola s2 = new Scatola(12, 1);
            s1.aggiungi(s2);
            return s1.libero();
        }, new String[]{"Scatola [35 10]","Scatola [12 1]"}, 23f));
        list.add(new Tester("Controlla spazio vuoto con dentro due scatole", () -> {
            Scatola s1 = new Scatola(10, 10);
            Scatola s2 = new Scatola(5, 1);
            Scatola s3 = new Scatola(3, 1);
            s1.aggiungi(s2);
            s1.aggiungi(s3);
            return s1.libero();
        }, new String[]{"Scatola [10 10]","Scatola [5 1]","Scatola [3 1]"}, 2f));

        List<TestResult> result = list.stream().map(x -> x.run()).toList();
        Tester.printResults(result);
    }
}
