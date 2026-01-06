#ifndef KAREL_HPP
#define KAREL_HPP

#include <vector>


class Karel
{
public:
    int x;                                              //coordenadas en el eje x
    int y;                                              //coordenadas en en eje y
    std::vector<int> coordinates;                       //coordenadas expresadas como un vector <x,y>
    int facing;                                         //hacia donde esta mirando (0: north, 1: west, 2: south, 3: east)
    unsigned int beepers;                               //numero de beepers qe karel tiene en la bolsa

    Karel();                         //constructores
    Karel(std::vector<int> c, int f);
    

    void move();
    void turnleft();
    bool BeepersInBag();
    std::vector<int> front();
    std::vector<int> left();
    std::vector<int> right();
};


#endif