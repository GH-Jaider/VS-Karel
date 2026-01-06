#include "Board.hpp"
#include <chrono>
#include <thread>


#include <stdio.h>


 Board::Board(Karel k, std::vector<Box> b, std::vector<Box> w, int x, int y): karel(k), beepers_list(b), walls_list(w), lenghtx(x), lenghty(y)
    {
    /* El constructor donde asignamos a cada propiedad del objeto un valor*/
    #ifdef __linux__
    this->penguin_for_display = true;
    #endif
    }


bool Board::find_beeper(std::vector<int> c)
    {
    /* Una función que recibe un vector de enteros en forma {x,y} que retorna verdadero si en el vector de los beepers
    hay un beeper con las coordenadas dadas*/
        for(int i = 0; i<beepers_list.size(); ++i)
        {
            if (beepers_list[i].x == c[0] and beepers_list[i].y == c[1])
            {
                return true;
            }
            
        }
        return false;
    }

void Board::set_frame_rate(unsigned int frame_rate){
    this->frame_rate = frame_rate;
}


bool Board::find_wall(std::vector<int> c)
    {
    /* Una función que recibe un vector de enteros en forma {x,y} que retorna verdadero si en el vector de los muros
    hay un muro con las coordenadas dadas*/       
        for(int i = 0; i<walls_list.size(); ++i)
        {
            if (walls_list[i].x == c[0] and walls_list[i].y == c[1])
            {
                return true;
            }
            
        }
        return false;
    }


 void Board::move()
    {
    /* Si karel al moverse se choca con un objeto termina la ejecución. Si no, cambia las coordenadas de Karel y lo mueve hacia el frente
    e imprime */
        if (front_is_bocked()) throw std::runtime_error("move: Can't move, front is blocked");
        karel.move();
        display();
    }


void Board::turnleft()
    {
    /* Karel gira a la izquierda con respecto a la posicion en que se encuentra */
        karel.turnleft();
        display();
    }


void Board::pickbeeper()
    {
    /* Revisa si hay un beeper en el vector de beepers que coincida con las cordenadas que se encuentra Karel.
        Si lo hay lo elimina del vector de beepers*/
        for(int i = 0; i<beepers_list.size(); ++i)
        {
            if (beepers_list[i].x == karel.x and beepers_list[i].y == karel.y)
            {
                ++karel.beepers;
                beepers_list.erase(beepers_list.begin()+i);
                display();
                return;
            }
            
        }
    /* si no se termina la ejecución y retorna error*/
        throw std::runtime_error("pickbreeper: Can't pick beepers, no beepers in: " + std::to_string(karel.x)+","+std::to_string(karel.y));
    }


void Board::putbeeper()
    {
    /* Revisa si Karel tiene beepers en la bolsa, si sí le resta un beeper a la bolsa de beepers, agrega un beeper al vector de beepers
    con las coordenadas de Karel, si no termina la ejecución y retorna error*/
        if (!karel.BeepersInBag()) throw std::runtime_error("putbeeper: Can't put beepers, no beepers in bag");
        karel.beepers--;
        Box temp;
        temp.x=karel.x;
        temp.y=karel.y;
        beepers_list.push_back(temp);
        display();
    }


bool Board::front_is_bocked()
    {
    /* Revisa si en las coordenadas del frente de Karel estan ocupadas por un muro, o es el borde del mapa*/
        if(karel.front()[0] < 0 || karel.front()[1] < 0 || karel.front()[0] == lenghtx || karel.front()[1] == lenghty)
        {
            return true;
        }
        return find_wall(karel.front());    
    }


bool Board::left_is_bocked()
    {
    /* Revisa si en las coordenadas de la izquierda de Karel estan ocupadas por un muro, o es el borde del mapa*/
        if(karel.left()[0] < 0 || karel.left()[1] < 0 || karel.left()[0] == lenghtx || karel.left()[1] == lenghty)
        {
            return true;
        }
        return find_wall(karel.left());    
    }


bool Board::right_is_bocked()
    {
    /* Revisa si en las coordenadas de la derecha de karel estan ocupadas por un muro, o es el borde del mapa*/
        if(karel.right()[0] < 0 || karel.right()[1] < 0 || karel.right()[0] == lenghtx || karel.right()[1] == lenghty)
        {
            return true;
        }
        return find_wall(karel.right());    
    }


bool Board::next_to_a_beeper()
    {
    /* Revisa si las coordenadas en la que se encuentra Karel coinciden con una coordenada de un beeper*/
        return find_beeper(karel.coordinates);
    }


bool Board::facing_north()
    {
    /* Revisa si Karel esta viendo hacia el norte*/
        return karel.facing == 0;
    }


bool Board::facing_west()
    {
    /* Revisa si Karel esta viendo hacia el oeste*/
        return karel.facing == 1;
    }


bool Board::facing_south()
    {
    /* Revisa si Karel esta viendo hacia el sur*/
        return karel.facing == 2;
    }


bool Board::facing_east()
    {
    /* Revisa si Karel esta viendo hacia el este*/
        return karel.facing == 3;
    }


bool Board::beeper_in_bag()
    {
    /* Revisa si Karel tiene beepers en la bolsa*/
        return karel.BeepersInBag();
    }


void Board::set_beepers_to(unsigned int nbeepers)
    {
    /* Función para asignar una cantidad de beepers a Karel para la ejecución */
        karel.beepers = nbeepers;
    }


void Board::display()
    {
    /* imprime el mapa de Karel*/
        std::this_thread::sleep_for(std::chrono::milliseconds(this->frame_rate));
        if (this->penguin_for_display)
            system("clear");
        else
            system("cls");
        char block;                                             //el caracter que imprimira
        for(int y = 0; y < lenghty; ++y)
        {
            for(int x = 0; x < lenghtx; ++x)
            {
            /* un ciclo aninado para conseguir las coordenas*/
                std::vector<int> c = {x,y};                     //un vector que representa las coordenadas a imprimir.

                
                if(c == karel.coordinates)
                {
                /* si las cordenadas c son las mismas que las de karel, asigna el valor a block
                segun hacia donde este viendo karel*/
                    if(facing_north())
                    {
                        block = '^';
                    }
                    else if (facing_east())
                    {
                        block = '>';
                    }
                    else if (facing_south())
                    {
                        block = 'v';
                    }
                    else if (facing_west())
                    {
                        block = '<';
                    }
                }
                else if (find_beeper(c))
                {
                /* si karel no esta en c, entonces busca en el vector de beepers si hay un beeper en c,
                si encuentra uno block = * */
                    block = '*';
                }
                else if (find_wall(c))
                {
                /* si karel no esta en c, y no hay beepers en c, entonces busca si hay un muro en c, si lo hay
                block = #*/
                    block = '#';
                }
                else
                {
                /* si noy hay nada en c entonces block = .*/
                    block = '.';
                }
                std::cout<<block;                   //imprime block segun lo que se encuentre en c
            }
            std::cout<<"\n";                        //salto de linea al acabar el for en x pasar al siguiente y
        }
        /* sistem para eliminar despues de cada paso para dar el efecto de movimiento */

        std::cout<<"\n";   
    }