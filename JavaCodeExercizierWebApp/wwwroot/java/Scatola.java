/**
 * Si vuole modellare un sistema di gestione di scatole. 

Definire la classe  Scatola che può contenere altre scatole. Ciascuna scatola è caratterizzata da un volume espresso con un attributo di tipo float. 
Definire i seguenti metodi: 

Scatola(float v, int n),  costruttore che crea una scatola vuota di volume v.  L'argomento n indica il numero massimo di scatole che può contenere. 
Il costruttore lancia un'eccezione di tipo IllegalArgumentException se n o v sono negativi o 0.
int numero() produce il numero di scatole presenti nella scatola. 
boolean aggiungi(Scatola s) aggiunge la scatola  s alla scatola in oggetto. 
Se la scatola da aggiungere è la stessa della scatola in oggetto o se è  null viene prodotto false. 
Se si è raggiunto il numero massimo di scatole o se la somma dei volumi delle scatole presenti, compresa la scatola da aggiungere, 
è superiore alla capacitè della scatola in oggetto viene prodotto false altrimenti la scatola è aggiunta e viene prodotto true. 
float libero() produce il volume disponibile.
float getVolume() produce il volume della scatola.
Sovrascrivere il metodo String toString() di modo che venga prodotto il numero di scatole presenti in una scatola e il volume libero disponibile. 
Ad esempio una scatola che contiene una scatola e che ha volume 6.0 produrrà "1 6.0". 
Sovrascrivere il metodo  boolean equals(Object s) che produce true se due scatole hanno la stessa capacità, false altrimenti.
ATTENZIONE:  é vietato l'uso di classi della libreria standard di Java ad eccezione di  String e delle sottoclassi di  Exception. 
Se utile, è possibile definire metodi ausiliari privati in aggiunta a quelli richiesti.
 */

public class Scatola {
    private int count;
    private final int max;
    private final float volume;
    private float volumeTotale;
    public Scatola(float v, int n){
        if(v <= 0 || n <= 0) throw new IllegalArgumentException();
        max = n;
        volume = v;
        volumeTotale = 0;
        count = 0;
    }
    public int numero(){return count;}
    boolean aggiungi(Scatola s){
        if(count >= max || s == this || s == null || s.volume + volumeTotale > volume)
            return false;
        count++;
        volumeTotale += s.volume;
        return true;
    }
    public float libero(){return volume - volumeTotale;}
    public float getVolume(){return volume;}
}