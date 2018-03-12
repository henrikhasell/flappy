using System;
using System.ComponentModel.DataAnnotations;

namespace Flappy.Models
{
    public class Game
    {
        [Key]
        public int Id {set; get;}

        public string Address { set; get; }

        public DateTime Time {set; get;}

        [Required]
        public int? Score {set; get;}
    }
}