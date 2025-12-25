import {Chessboard, type PieceDropHandlerArgs} from 'react-chessboard';
import {useEffect, useMemo, useRef, useState} from "react";
import { Chess } from 'chess.js';

function App() {

    // create a chess game using a ref to always have access to the latest game state within closures and maintain the game state across renders
    const chessGameRef = useRef(new Chess());
    const chessGame = chessGameRef.current;

    // track the current position of the chess game in state to trigger a re-render of the chessboard
    const [chessPosition, setChessPosition] = useState(chessGame.fen());

    // make a random "CPU" move
    function makeRandomMove() {
        // get all possible moves`
        const possibleMoves = chessGame.moves();

        // exit if the game is over
        if (chessGame.isGameOver()) {
            return;
        }

        // pick a random move
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

        // make the move
        chessGame.move(randomMove);

        // update the position state
        setChessPosition(chessGame.fen());
    }

    // handle piece drop
    function onPieceDrop({
        sourceSquare,
        targetSquare
    }: PieceDropHandlerArgs) {
        // type narrow targetSquare potentially being null (e.g. if dropped off board)
        if (!targetSquare) {
            return false;
        }

        // try to make the move according to chess.js logic
        try {
            chessGame.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q' // always promote to a queen for example simplicity
            });

            // update the position state upon successful move to trigger a re-render of the chessboard
            setChessPosition(chessGame.fen());

            // make random cpu move after a short delay
            setTimeout(makeRandomMove, 500);

            // return true as the move was successful
            return true;
        } catch {
            // return false as the move was not successful
            return false;
        }
    }

    // Responsive board width that is always smaller than the viewport
    const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 800);

    useEffect(() => {
        function onResize() {
            setViewportWidth(window.innerWidth);
        }
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // cap board width to min(90vw, 640px) and ensure at least 240px
    const boardWidth = useMemo(() => {
        const widthFromVw = Math.floor(viewportWidth * 0.9);
        return Math.max(240, Math.min(widthFromVw, 800));
    }, [viewportWidth]);

    // set the chessboard options
    const chessboardOptions = {
        position: chessPosition,
        id: 'play-vs-random',
        boardWidth,
        onPieceDrop
    };

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
            <div style={{ width: `${boardWidth}px` }}>
                <Chessboard options={chessboardOptions} />
            </div>
        </div>
    );
}

export default App
