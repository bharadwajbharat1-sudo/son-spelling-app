// Remove the curly braces {} because it's a default export
import SpellingApp from "@/components/active-spelling-retrieval";

export default function Home() {
  return (
    <main>
      <SpellingApp /> 
    </main>
  );
}