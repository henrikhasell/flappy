using System;
using System.ComponentModel.DataAnnotations;

namespace Flappy.Models
{
    public class Score
    {
        [Key]
        public int Id {set; get;}

        [DisplayFormat(/* TODO */)]
        public DateTime Time {set; get;}

        [Required]
        public string Name {set; get;}

        [Required]
        public int Value {set; get;}
    }
}