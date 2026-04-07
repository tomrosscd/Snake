import GameBoard from '@/components/game/GameBoard';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 selection:bg-accent selection:text-accent-foreground">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-primary tracking-tight">
          Tomaconda
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Use arrow keys or on-screen buttons to eat the tacos!
        </p>
      </div>
      <GameBoard />
    </main>
  );
}
