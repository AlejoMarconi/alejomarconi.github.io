function rotate() {
    const previousShape = tetromino.shape;
    const N = tetromino.shape.length;

    // Rotar la matriz 90 grados en sentido horario
    const rotatedShape = tetromino.shape[0].map((_, index) =>
        tetromino.shape.map(row => row[index]).reverse()
    );

    const previousX = tetromino.x;
    let offset = 0;

    tetromino.shape = rotatedShape;

    while (collides()) {
        tetromino.x = previousX + offset;
        offset++;

        if (offset > N) {
            tetromino.shape = previousShape;
            tetromino.x = previousX;
            break;
        }
    }
}
