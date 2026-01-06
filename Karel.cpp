#include "Karel.hpp"


Karel::Karel():x(0), y(0), coordinates{0,0}, facing(-1), beepers(0)
    { 
    /* Un constructor vacio que coloca a karel en la posción (0,0) con facing = -1, esto servira para la creación del mapa */
    }


Karel::Karel(std::vector<int> c, int f): x(c[0]), y(c[1]), coordinates(c), facing(f), beepers(0)
    { 
    /* El constructor que recibe un vector c = {x,y}, con cual se le asignaran los valores x y y a Karel,
     y un entero f que representa hacia donde esta mirando karel*/
    }


void Karel::move()
{
/* move cambia los valores de las coordenadas de karel en una posición */
    if(facing == 0)
    {
        y--;
        coordinates = {x,y};
    }
    else if (facing == 1)
    {
        x--;
        coordinates = {x,y};
    }
    else if (facing == 2)
    {
        ++y;
        coordinates = {x,y};
    }
    else
    {
        ++x;
        coordinates = {x,y};
    }
}


 void Karel::turnleft()
    {
    /* Cambia la dirección hacia donde Karel esta viendo con un giro a la izquierda */
        facing = (facing + 1) % 4;
    }


 bool Karel::BeepersInBag()
    {
    /*  Revisa si Karel tiene beepers en la bolsa*/
        return beepers > 0;
    }


std::vector<int> Karel::front()
    {
    /* Retorna un vector con las coordenadas del frente de Karel*/
        std::vector<int> front;
        if(facing == 0)
        {
            return {x,y-1};
        }
        else if (facing == 1)
        {
            return {x-1,y};
        }
        else if (facing == 2)
        {
            return {x,y+1};
        }
        else
        {
            return {x+1,y};
        }
    }


std::vector<int> Karel::left()
    {
    /* Retorna un vector con las coordenadas de la izquierda de Karel*/
        if(facing == 0)
        {
            return {x-1,y};
        }
        else if (facing == 1)
        {
            return {x,y+1};
        }
        else if (facing == 2)
        {
            return {x+1,y};
        }
        else
        {
            return {x,y-1};
        }
    }


 std::vector<int> Karel::right()
    {
    /* Retorna un vector con las coordenadas de la derecha de Karel*/
        if(facing == 0)
        {
            return {x+1,y};
        }
        else if (facing == 1)
        {
            return {x,y-1};
        }
        else if (facing == 2)
        {
            return {x-1,y};
        }
        else
        {
            return {x,y+1};
        }
    }