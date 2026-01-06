#ifndef BOARD_HPP
#define BOARD_HPP

#include "Karel.hpp"
#include <string>
#include <iostream>


struct Box
{
    /*Una estructura que representa una casilla en el mapa (coordenadas)*/
    int x;
    int y;
};

class Board
{
private:
    Karel karel;                                    //Un Objeto Karel que moveremos y controlaremos
    std::vector<Box> beepers_list;                  //Un vector de beepers(coordenadas) que nos servira para saber si Karel se encuentra sobre uno
    std::vector<Box> walls_list;                    //Un vector de muros(coordenadas) que nos servira para saber si Karel esta cerca de uno
    int lenghtx;                                    //Un entero que nos servira para saber la longitud horizontal del mapa
    int lenghty;                                    //Un entero que nos servira para saber la longitud vertical del mapa

    bool penguin_for_display = false;
    unsigned int frame_rate = 500;
    bool find_beeper(std::vector<int> c);
    bool find_wall(std::vector<int> c);

public:

    Board(Karel k, std::vector<Box> b, std::vector<Box> w, int x, int y);

    void set_frame_rate(unsigned int frame_rate);
    void move();
    void turnleft();
    void pickbeeper();
    void putbeeper();
    bool front_is_bocked();
    bool left_is_bocked();
    bool right_is_bocked();
    bool next_to_a_beeper();
    bool facing_north();
    bool facing_west();
    bool facing_south();
    bool facing_east();
    bool beeper_in_bag();
    void display();
    void set_beepers_to(unsigned int nbeepers);
};

#endif
