
"use client";

import Image from 'next/image';
import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import useInterval from '@/hooks/useInterval';

const GRID_SIZE = 10;
const INITIAL_CELL_SIZE = 32; // Default cell size before dynamic calculation
const INITIAL_SPEED = 200; // ms
const AVATAR_SRC = "https://iili.io/3ZvvOfR.png";

type Coordinates = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const directionVectors: Record<Direction, Coordinates> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const oppositeDirections: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export default function GameBoard() {
  const [snakeSegments, setSnakeSegments] = useState<Coordinates[]>([
    { x: Math.floor(GRID_SIZE / 2) -1 , y: Math.floor(GRID_SIZE / 2) }, // Adjusted for dynamic centering
    { x: Math.floor(GRID_SIZE / 2) -1 , y: Math.floor(GRID_SIZE / 2) + 1},
    { x: Math.floor(GRID_SIZE / 2) -1 , y: Math.floor(GRID_SIZE / 2) + 2}
  ]);
  const [foodPosition, setFoodPosition] = useState<Coordinates | null>(null);
  const [direction, setDirection] = useState<Direction>('UP');
  const pendingDirectionRef = useRef<Direction | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(INITIAL_SPEED);

  const { toast } = useToast();

  const boardRef = useRef<HTMLDivElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const [calculatedCellSize, setCalculatedCellSize] = useState(INITIAL_CELL_SIZE);

  useEffect(() => {
    const storedHighScore = localStorage.getItem('tomacondaHighScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
  }, []);
  
  useEffect(() => {
    const gameAreaElement = gameAreaRef.current;
    if (!gameAreaElement) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width } = entry.contentRect; // gameAreaRef is aspect-square, so width is enough
        if (width > 0) {
          setCalculatedCellSize(Math.floor(width / GRID_SIZE));
        }
      }
    });

    observer.observe(gameAreaElement);

    // Initial calculation in case ResizeObserver doesn't fire immediately or element already has size
    const initialWidth = gameAreaElement.offsetWidth;
    if (initialWidth > 0) {
      setCalculatedCellSize(Math.floor(initialWidth / GRID_SIZE));
    }

    return () => {
      if (gameAreaElement) {
        observer.unobserve(gameAreaElement);
      }
      observer.disconnect();
    };
  }, []);


  const generateFoodPosition = useCallback((currentSnakeSegments: Coordinates[]): Coordinates => {
    let newFoodPosition;
    do {
      newFoodPosition = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      currentSnakeSegments.some(
        (segment) => segment.x === newFoodPosition.x && segment.y === newFoodPosition.y
      )
    );
    return newFoodPosition;
  }, []);
  
  useEffect(() => {
    if (isGameRunning && !foodPosition && calculatedCellSize > 0) {
      setFoodPosition(generateFoodPosition(snakeSegments));
    }
  }, [isGameRunning, foodPosition, generateFoodPosition, snakeSegments, calculatedCellSize]);


  const resetGame = useCallback(() => {
    const initialSnake = [
        { x: Math.floor(GRID_SIZE / 2) -1 , y: Math.floor(GRID_SIZE / 2) }, 
        { x: Math.floor(GRID_SIZE / 2) -1 , y: Math.floor(GRID_SIZE / 2) + 1},
        { x: Math.floor(GRID_SIZE / 2) -1 , y: Math.floor(GRID_SIZE / 2) + 2}
    ];
    setSnakeSegments(initialSnake);
    if (calculatedCellSize > 0) {
      setFoodPosition(generateFoodPosition(initialSnake));
    }
    setDirection('UP');
    pendingDirectionRef.current = null;
    setScore(0);
    setIsGameOver(false);
    setIsGameRunning(true);
    setGameSpeed(INITIAL_SPEED);
    if (boardRef.current) {
      boardRef.current.focus();
    }
  }, [generateFoodPosition, calculatedCellSize]);

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    setIsGameRunning(false);
    toast({
      title: "Game Over!",
      description: `Your score: ${score}. High Score: ${Math.max(score, highScore)}`,
      variant: "destructive",
    });
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('tomacondaHighScore', score.toString());
    }
  }, [score, highScore, toast]);

  const gameLoop = useCallback(() => {
    if (!isGameRunning || isGameOver || !foodPosition || calculatedCellSize <= 0) return;

    if (pendingDirectionRef.current) {
      const currentDirectionVector = directionVectors[direction];
      const pendingDirectionVector = directionVectors[pendingDirectionRef.current];
      if (pendingDirectionVector.x !== -currentDirectionVector.x || pendingDirectionVector.y !== -currentDirectionVector.y) {
        setDirection(pendingDirectionRef.current);
      }
      pendingDirectionRef.current = null;
    }
    
    const newSnakeSegments = [...snakeSegments];
    const head = { ...newSnakeSegments[0] };
    const dirVector = directionVectors[direction];

    head.x += dirVector.x;
    head.y += dirVector.y;

    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      handleGameOver();
      return;
    }

    for (let i = 1; i < newSnakeSegments.length; i++) {
      if (newSnakeSegments[i].x === head.x && newSnakeSegments[i].y === head.y) {
        handleGameOver();
        return;
      }
    }

    newSnakeSegments.unshift(head);

    if (head.x === foodPosition.x && head.y === foodPosition.y) {
      setScore((s) => s + 1);
      setFoodPosition(generateFoodPosition(newSnakeSegments));
      setGameSpeed(prev => Math.max(50, prev - 2));
    } else {
      newSnakeSegments.pop();
    }

    setSnakeSegments(newSnakeSegments);
  }, [isGameRunning, isGameOver, snakeSegments, direction, foodPosition, handleGameOver, generateFoodPosition, calculatedCellSize]);

  useInterval(gameLoop, isGameRunning && !isGameOver && calculatedCellSize > 0 ? gameSpeed : null);

  const handleKeyDown = useCallback((e: globalThis.KeyboardEvent) => {
    e.preventDefault();
    let newDirection: Direction | null = null;
    switch (e.key) {
      case 'ArrowUp': newDirection = 'UP'; break;
      case 'ArrowDown': newDirection = 'DOWN'; break;
      case 'ArrowLeft': newDirection = 'LEFT'; break;
      case 'ArrowRight': newDirection = 'RIGHT'; break;
      case ' ': 
        if (!isGameRunning || isGameOver) {
          resetGame();
        }
        return;
      default: return;
    }
    if (newDirection && newDirection !== oppositeDirections[direction]) {
      pendingDirectionRef.current = newDirection;
    }
  }, [direction, isGameRunning, isGameOver, resetGame]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);


  const changeDirection = (newDir: Direction) => {
    if (newDir !== oppositeDirections[direction]) {
       pendingDirectionRef.current = newDir;
    }
     if (boardRef.current) {
      boardRef.current.focus(); 
    }
  };

  return (
    <Card className="w-full max-w-xl shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-2xl font-semibold text-primary-foreground">Score: {score}</CardTitle>
        <div className="text-lg text-muted-foreground">High Score: {highScore}</div>
      </CardHeader>
      <CardContent className="p-4"> {/* Consistent padding */}
        <div 
          ref={gameAreaRef} 
          className="w-full aspect-square relative mx-auto"
          // Example: style={{ border: '1px solid red' }} // For debugging layout
        >
          {calculatedCellSize > 0 && (
            <>
              <div
                ref={boardRef}
                tabIndex={0} 
                className="w-full h-full relative bg-background/50 overflow-hidden rounded-md shadow-inner focus:outline-none focus:ring-2 focus:ring-accent"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                }}
                aria-label="Game Board"
              >
                {snakeSegments.map((segment, index) => (
                  <div
                    key={index}
                    style={{
                      gridColumnStart: segment.x + 1,
                      gridRowStart: segment.y + 1,
                      width: calculatedCellSize, // Content sized by this
                      height: calculatedCellSize, // Content sized by this
                      // Center the image if cell is slightly larger than image due to 1fr vs calculatedCellSize
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label={`Snake segment ${index + 1}`}
                  >
                    <Image 
                      src={AVATAR_SRC} 
                      alt="Snake Avatar" 
                      width={calculatedCellSize} 
                      height={calculatedCellSize} 
                      className="rounded-sm"
                      data-ai-hint="avatar face"
                      unoptimized={true} 
                    />
                  </div>
                ))}

                {foodPosition && isGameRunning && (
                  <div
                    className="flex items-center justify-center animate-pulse" 
                    style={{
                      gridColumnStart: foodPosition.x + 1,
                      gridRowStart: foodPosition.y + 1,
                      width: calculatedCellSize,
                      height: calculatedCellSize,
                      fontSize: `${calculatedCellSize * 0.75}px`, 
                    }}
                    aria-label="Taco food"
                  >
                    🌮
                  </div>
                )}
              </div>

              {(!isGameRunning || isGameOver) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-md z-10 p-4">
                  <h2 className="text-3xl sm:text-4xl font-bold text-destructive-foreground mb-4 text-center">
                    {isGameOver ? "Game Over!" : "Tomaconda"}
                  </h2>
                  <p className="text-lg sm:text-xl text-primary-foreground mb-6 text-center">
                    {isGameOver ? `Final Score: ${score}` : "Eat the tacos!"}
                  </p>
                  <Button
                    onClick={resetGame}
                    variant="default"
                    size="lg"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 text-md sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-lg shadow-md"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    {isGameOver ? "Play Again" : "Start Game"}
                  </Button>
                  <p className="mt-4 text-xs sm:text-sm text-muted-foreground text-center">Use arrow keys or on-screen buttons. Press Space to start.</p>
                </div>
              )}
            </>
          )}
          {calculatedCellSize <= 0 && (
             <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading game board...</div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center pt-4">
        <div className="grid grid-cols-3 gap-2 w-48">
          <div></div> 
          <Button variant="outline" size="icon" onClick={() => changeDirection('UP')} aria-label="Move Up" className="bg-secondary hover:bg-secondary/80">
            <ArrowUp />
          </Button>
          <div></div> 
          <Button variant="outline" size="icon" onClick={() => changeDirection('LEFT')} aria-label="Move Left" className="bg-secondary hover:bg-secondary/80">
            <ArrowLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => changeDirection('DOWN')} aria-label="Move Down" className="bg-secondary hover:bg-secondary/80">
            <ArrowDown />
          </Button>
          <Button variant="outline" size="icon" onClick={() => changeDirection('RIGHT')} aria-label="Move Right" className="bg-secondary hover:bg-secondary/80">
            <ArrowRight />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
