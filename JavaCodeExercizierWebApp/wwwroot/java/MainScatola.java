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
        list.add(new Tester("Aggiunta scatola in se stessa", () -> {
            Scatola s1 = new Scatola(10, 10);
            return s1.aggiungi(s1);
        }, new String[]{"Scatola [10 10]"}, false));
        list.add(new Tester("Aggiunta scatola in una piu' piccola", () -> {
            Scatola s1 = new Scatola(10, 10);
            Scatola s2 = new Scatola(15, 1);
            return s1.aggiungi(s2);
        }, new String[]{"Scatola [10 10]","Scatola [15 1]"}, false));
        List<TestResult> result = list.stream().map(x -> x.run()).toList();
        int tot = result.size();
        int successes = (int)result.stream().filter(x -> x.type() == TestResultType.SUCCESS).count();
        int failures = (int)result.stream().filter(x -> x.type() == TestResultType.FAILURE).count();
        int errors = (int)result.stream().filter(x -> x.type() == TestResultType.ERROR).count();
        System.out.println("Test superati [" + successes + "/" + tot + "]");
        if(failures > 0){
            System.out.println("Fallimenti: " + failures);
            for(TestResult tr : result){
                if(tr.type() == TestResultType.FAILURE)
                    System.out.println("- " + tr.message());
            }
        }
        if(errors > 0){
            System.out.println("Errori: " + errors);
            for(TestResult tr : result){
                if(tr.type() == TestResultType.ERROR)
                    System.out.println("- " + tr.message());
            }
        }
    }
}
