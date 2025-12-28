import { Chess } from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import './ChessBoardGame.css';

const ChessBoardGame = () => {
  // Chess game instance
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  // Current FEN to re-render the chessboard
  const [chessPosition, setChessPosition] = useState(chessGame.fen());

  // Make a random "CPU" move
  function makeRandomMove() {
    const possibleMoves = chessGame.moves();
    if (chessGame.isGameOver()) return;
    const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    chessGame.move(randomMove);
    setChessPosition(chessGame.fen());
  }

  // Handle piece drop
  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    if (!targetSquare) return false;
    try {
      chessGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      setChessPosition(chessGame.fen());
      setTimeout(makeRandomMove, 500);
      return true;
    } catch {
      return false;
    }
  }

  // Responsive board width that is always smaller than the viewport
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 800
  );

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // cap board width to min(90vw, 800px) and ensure at least 240px
  const boardWidth = useMemo(() => {
    const widthFromVw = Math.floor(viewportWidth * 0.9);
    return Math.max(240, Math.min(widthFromVw, 800));
  }, [viewportWidth]);

  // Chessboard options
  const chessboardOptions = {
    position: chessPosition,
    id: 'play-vs-random',
    boardWidth,
    onPieceDrop
  } as const;

  return (
    <div className="chessboard-wrapper">
      <div id="chessboard-container" className="chessboard-container" style={{ width: `${boardWidth}px` }}>
        <Chessboard options={chessboardOptions} />
      </div>
    </div>
  );
};

export default ChessBoardGame;

