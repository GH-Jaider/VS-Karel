#include "functions.hpp"


int main(int argc, char* argv[]){

    std::string map_name;
    std::string file_name;
    unsigned int beepers;
    unsigned int frame_rate = 0;

    switch (argc)
    {
    case 2:
        map_name = "map.txt";
        file_name = "instructions.txt";
        beepers = std::stoi(argv[1]);
        break;
    case 3:
        map_name = argv[2];
        file_name = "map.txt";
        beepers = std::stoi(argv[1]);
        break;
    case 4:
        map_name = argv[2];
        file_name = argv[3];
        beepers = std::stoi(argv[1]);
        break;
    case 5:
        map_name = argv[2];
        file_name = argv[3];
        beepers = std::stoi(argv[1]);    
        frame_rate = std::stoi(argv[4]);
        break;
    default:
        map_name = "map.txt";
        file_name = "instructions.txt";
        beepers = 0;
        break;
    }

    Board mapa = create_map(map_name);
    mapa.set_beepers_to(beepers);
    if (frame_rate)
        mapa.set_frame_rate(frame_rate);
    // parte con las intrucciones del txt
    print_logo("LOGO.txt");
    mapa.display();
    read_instructions(file_name, mapa);
    mapa.display();

    return 0;
}