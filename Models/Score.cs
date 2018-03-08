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

        [MaxLength(16, ErrorMessage="Maximum name length is 16 characters."), Required(ErrorMessage="Please enter your name.")]
        public string Name {set; get;}

        [Required(ErrorMessage="Score value is missing. Refresh the page.")]
        public int Value {set; get;}
    }
}